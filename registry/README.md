# Registry

Git is the source of truth. The database, if any, is only an index.

```text
registry/
  plugins/          committed Plugin YAML; one file per plugin
  candidates/       scanner-owned YAML; never installable / featured
  passports/        immutable PluginVersion + scannerVersion evidence
  packs/            pack contracts
  capabilities/     versioned capability dictionary
  rules/            trust promotion rules
  fixtures/         local negative/positive install fixtures
```

## Author submission

Open a PR that adds `registry/plugins/<owner>__<repo>.yml`. CI rejects:

- missing `dsh.bundle`
- mutable versions (`@latest`, branch, `HEAD`)
- auto-discovered rows committed as `installable` / `featured` from `candidates/`
- scene capability self-annotation by authors

## Counting rule

Never add `curated + autoDiscovered + listed` together in public copy. Those numbers use different denominators.
