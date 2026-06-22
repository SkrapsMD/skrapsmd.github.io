import { Input } from 'skrapsmd-website'

export const Default = () => <Input placeholder="Search papers…" />

export const WithValue = () => <Input type="email" defaultValue="mdsparks@roarkworks.com" />

export const Disabled = () => <Input placeholder="Disabled" disabled />
