import { CodeBlock } from 'skrapsmd-website'

export const Stata = () => (
  <CodeBlock>{`reghdfe price tariff_exposure, absorb(firm year) vce(cluster firm)`}</CodeBlock>
)

export const MultiLine = () => (
  <CodeBlock>{`import countryconverter as coco
cc = coco.CountryConverter()
cc.convert(["USA", "CAN", "MEX"], to="name_short")`}</CodeBlock>
)
