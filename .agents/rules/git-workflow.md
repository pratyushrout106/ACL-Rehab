# Git Workflow Instructions

## Commands and Branch Targets:
1. **"push this code"**:
   - Commit any pending changes.
   - Push to the user's personal branch: `pratyush` (`git push origin pratyush`).
   - Do NOT push directly to `main`.

2. **"push this code to the main branch"**:
   - Ensure changes are committed on `pratyush`.
   - Switch to `main`, pull the latest remote changes (`git pull origin main`).
   - Merge `pratyush` into `main` (`git merge pratyush`).
   - Push to `origin/main` (`git push origin main`).
   - Switch back to `pratyush` for ongoing development.
