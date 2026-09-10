# PITWALL

Desktop F1 strategy desk. You set a tyre plan; a Rust engine runs a Monte Carlo envelope of independent races; the app plays back the median-finish run on a timing tower and circuit map.

Evolved from the Python/Flask original: [pitwall_v2](https://github.com/xandermckie/pitwall_v2).

```
crates/pitwall-sim     stochastic race model + Monte Carlo
apps/desktop           Tauri 2 + React/TypeScript UI
```

## Run

Requirements: Rust 1.80+, Node 22+, WebView2 (Windows). Tauri on Windows needs the **MSVC** toolchain (Visual Studio Build Tools with the C++ workload) or MinGW `dlltool` if your default host is `x86_64-pc-windows-gnu`. GitHub Actions `windows-latest` uses MSVC.

```bash
cd apps/desktop
npm install
npm run tauri dev
```

## Tests

```bash
cargo test -p pitwall-sim
cd apps/desktop && npm test
```

## Model (honest scope)

This is a **stochastic race model**, not physics and not official Formula 1 data.

Each race draws tyre warm-up / linear degradation / cliff, constructor pace, constructor deg resistance, dirty air, a DRS closing bonus, driver errors, pit loss (cheaper under safety car), and weather. Positions are cumulative time.

`simulate_many` runs N independent seeded races (default 500). The UI plays the run whose lead-driver finish is closest to the median, and shows P(win), P(podium), expected points, and the 5th–95th position band.

## GitHub

This tree is a new git repo. Publish it (GitHub CLI must be logged in):

```bash
gh auth login
gh repo create pitwall-rs --public --source=. --remote=origin --push
```

## Windows build

This machine’s Rust host is `x86_64-pc-windows-gnu` and Tauri needs `dlltool` or the MSVC toolchain. After installing Visual Studio Build Tools (C++ workload):

```bash
rustup toolchain install stable-x86_64-pc-windows-msvc
rustup default stable-x86_64-pc-windows-msvc
cd apps/desktop
npm run tauri build
```

Installer output: `target/release/bundle/` (workspace target directory).

## Screenshots

After `npm run tauri dev`, capture Briefing (strategy form), Race (tower + map), and Analysis (histogram + classification) for the README.

## Legal

Unofficial fan project. Not affiliated with Formula 1, the FIA, or any constructor. F1, Formula One and related marks are trade marks of Formula One Licensing B.V.
