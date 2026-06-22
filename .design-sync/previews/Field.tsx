import { Field, Input } from 'skrapsmd-website'

export const WithInput = () => (
  <Field label="Email address" htmlFor="email">
    <Input id="email" type="email" placeholder="name@institution.edu" />
  </Field>
)

export const Stacked = () => (
  <div style={{ display: 'grid', gap: 12, maxWidth: 280 }}>
    <Field label="First name" htmlFor="fn">
      <Input id="fn" placeholder="Michael" />
    </Field>
    <Field label="Institution" htmlFor="inst">
      <Input id="inst" placeholder="UC San Diego" />
    </Field>
  </div>
)
