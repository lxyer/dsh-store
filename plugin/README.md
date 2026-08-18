# `@tech2077/dsh-store-plugin`

In-app DSH Store host. Published as `@tech2077/dsh-store-plugin@0.1.1`.

```bash
dsh plugin --profile web add @tech2077/dsh-store-plugin@0.1.1
```

Then restart `dsh web`. Settings → Plugins will show DSH Store / Installed / Gaps.

Do not use `latest` or a git branch. Fallback: `https://github.com/lxyer/dsh-store/releases/download/v0.1.1/dsh-store-plugin-0.1.1.tgz`.

## Contract

- Registers `settings.plugins.tab` ids `store` / `installed` / `gaps`.
- Does **not** register `settings.section`.
- Host routes live under `/dsh-store/*` and accept same-origin POST only.
- Desktop / supervisor mode never shows a restart button.
- Blocked and candidate plugins have no install button and the agent install tool refuses them.

The package is not installed into the user's current `$DSH_HOME` by this repository. Use an isolated profile when exercising `dsh plugin add`.
