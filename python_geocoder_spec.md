# Python Geocoder — Build Spec

A Python port of the in-browser geocoder shipped at `#geocoder` on the site. Same three-tier fallback, same input flexibility, but callable from a notebook or a script as one function on a `pandas.DataFrame`.

## Public API

```python
from typing import Optional
import pandas as pd

def get_lat_long(
    df: pd.DataFrame,
    address: Optional[str] = None,   # column name in df, or None
    city_name: str = ...,            # column name in df
    state: str = ...,                # column name in df
    zip_code: str = ...,             # column name in df
    *,
    user_agent: str = "skrapsmd-geocoder/1.0",
    progress: bool = True,
) -> pd.DataFrame:
    """Return a copy of `df` with `latitude` and `longitude` columns appended.

    Parameters
    ----------
    df         : input DataFrame; not mutated.
    address    : column holding street address; pass None when unavailable.
    city_name  : column holding city/locality.
    state      : column holding state (USPS abbreviation or full name).
    zip_code   : column holding ZIP. May be int, float, or str in the source.
    user_agent : sent to Nominatim only (their usage policy requires one).
    progress   : print "i/N matched..." per row when True.

    Returns
    -------
    df_lat_long : pd.DataFrame
        Copy of df with two new trailing columns:
          - `latitude`  (float or NaN)
          - `longitude` (float or NaN)
        If `df` already has columns named `latitude` / `longitude`
        (case-insensitive), the new ones are suffixed `_geocoded` to avoid
        overwriting source data.
    """
```

Domestic (US) addresses only.

## Three-Tier Fallback (must mirror the JS exactly)

Per row, attempt in order. Return on the first match; otherwise leave lat/lon as `NaN`.

| Tier | Endpoint | Inputs required | URL |
|------|----------|------------------|-----|
| 1 | Census `locations/address` (structured) | street **and** city **and** state | `https://geocoding.geo.census.gov/geocoder/locations/address` |
| 2 | Census `locations/onelineaddress` | city **and** state (zip optional) | `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` |
| 3 | Nominatim (OpenStreetMap) zip centroid | zip | `https://nominatim.openstreetmap.org/search` |

Query parameters:

- **Tier 1:** `street, city, state, zip, benchmark=Public_AR_Current, format=json`
- **Tier 2:** `address="{city}, {state} {zip}".strip(), benchmark=Public_AR_Current, format=json`
- **Tier 3:** `postalcode={zip}, country=US, format=json, limit=1`

Census coordinates come back at `result.addressMatches[0].coordinates.{x,y}` (x=lon, y=lat). Nominatim coordinates come back at `[0].lat` and `[0].lon` as strings.

## Cell Coercion (don't assume types)

Source spreadsheets are messy. Before sending any field to the API:

```python
def _clean(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()

def _clean_zip(value) -> str:
    s = _clean(value)
    # "30309.0" → "30309" (Excel float zips)
    return s[:-2] if s.endswith(".0") else s
```

Result must be a string with surrounding whitespace removed. A column may be entirely missing (when `address` is `None`); treat that path as a tier-1 skip, not an error.

## Rate Limiting

- **Census** has no published per-IP limit for the public geocoder. No client-side throttle needed.
- **Nominatim** has a strict 1 req/sec policy. Use a module-level "next allowed time" guard so the throttle persists across calls within the same Python session:

  ```python
  _NOMINATIM_NEXT_AT = 0.0      # monotonic time
  _NOMINATIM_GAP_S   = 1.1      # match the JS pad

  def _wait_for_nominatim_slot() -> None:
      global _NOMINATIM_NEXT_AT
      now = time.monotonic()
      delay = _NOMINATIM_NEXT_AT - now
      if delay > 0:
          time.sleep(delay)
      _NOMINATIM_NEXT_AT = time.monotonic() + _NOMINATIM_GAP_S
  ```

- Set the `User-Agent` header on the Nominatim request — their policy refuses requests with a blank or default UA.

## Output Column Naming

```python
def _resolve_output_columns(existing_cols) -> tuple[str, str]:
    lower = {c.lower() for c in existing_cols}
    lat_col = "latitude_geocoded" if "latitude"  in lower else "latitude"
    lon_col = "longitude_geocoded" if "longitude" in lower else "longitude"
    return lat_col, lon_col
```

Append both new columns at the end of the returned DataFrame; preserve the order of all original columns. Never mutate `df` in place — copy first.

## Failure Semantics

- HTTP error, timeout, malformed JSON → treat as "no match", continue to the next tier.
- All three tiers fail → leave `(NaN, NaN)` for that row; do not raise.
- The function should never propagate an exception from the network layer. A keyboard interrupt should still abort cleanly.

A `requests.Session` shared across rows is fine and saves TCP handshakes; set a per-request timeout of ~15s.

## Module Layout

A single-module package is sufficient:

```
geocoder/
  __init__.py           # re-exports `get_lat_long`
  api.py                # public function
  endpoints.py          # _try_census_structured, _try_census_oneline, _try_nominatim_zip
  rate_limit.py         # _wait_for_nominatim_slot, shared constants
pyproject.toml          # uv-friendly; deps: pandas, requests
README.md
tests/
  test_get_lat_long.py
```

Pure stdlib + `pandas` + `requests`. Avoid `geopy` so the behavior tracks the JS line-for-line; if you want to swap it in later, restrict it to tier 3 only.

## Suggested Tests

1. **Happy path:** DataFrame of 5 known-good addresses → all 5 rows non-NaN, tier 1 should match every one.
2. **Missing street:** Pass `address=None`. Verify tier 2 carries the load and that lat/lon still populate.
3. **String vs numeric ZIP:** Same address with ZIP as `"30309"`, `30309`, and `30309.0` → identical coordinates.
4. **Tier-3 fallback:** Fabricate a row with a real ZIP but a city that doesn't exist in that ZIP. Confirm tier 2 fails and tier 3 fills with the ZIP centroid.
5. **No match anywhere:** Fictitious ZIP (e.g., `"00000"`) → `NaN` lat/lon, no exception.
6. **Column preservation:** Input with 8 extra unrelated columns → all 8 are in the output, original order, plus `latitude`/`longitude` at the end.
7. **Existing lat/lon columns:** Input already has a `latitude` column → output has `latitude_geocoded` / `longitude_geocoded` instead, source column untouched.
8. **Rate-limit pacing:** Force 3 tier-3 calls back-to-back; total elapsed time ≥ 2.2 s (two 1.1 s gaps).

## Mapping to the JS Implementation

For cross-reference while porting (`0_code/a_partials/07_geocoder.html`):

| JS symbol | Python equivalent |
|-----------|-------------------|
| `CENSUS_STRUCTURED` | constant in `endpoints.py` |
| `CENSUS_ONELINE` | constant in `endpoints.py` |
| `NOMINATIM_SEARCH` | constant in `endpoints.py` |
| `BENCHMARK` | `"Public_AR_Current"` |
| `NOMINATIM_MIN_GAP_MS = 1100` | `_NOMINATIM_GAP_S = 1.1` |
| `jsonpRequest(...)` | not needed — Python's `requests` isn't CORS-bound, so plain `GET` works |
| `geocodeRow(...)` | `_geocode_row(...)` calling the three `_try_*` helpers in order |
| String coercion + `.replace(/\.0+$/, "")` | `_clean` / `_clean_zip` |

The JSONP wrapper in the JS exists *only* because browsers enforce CORS and Census doesn't send the headers. Python's `requests` doesn't care — call the JSON endpoints directly and parse `response.json()`.
