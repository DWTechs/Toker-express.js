# 0.1.3 (Oct 30th 2025)

  - Converted all middleware functions from async to synchronous
  - Updated function return types from Promise<void> to void
  - Dependencies updates:
    - "@dwtechs/checkard": "3.6.0",
    - "@dwtechs/winstan": "0.5.0"

# 0.1.2 (Oct 06th 2025)

  - ACCESS_TOKEN_DURATION and REFRESH_TOKEN_DURATION are now parsed as numbers
  - Removed MyResponse interface dependency
  - Updated refresh function to use standard Express Response interface
  - Tokens are now stored in both res.locals and req.body instead of res.rows for better flexibility

# 0.1.1 (Sep 10th 2025)

  - Dependencies updates:
    - "@dwtechs/checkard": "3.5.1",
    - "@dwtechs/toker": "0.1.1",
    - "@dwtechs/winstan": "0.4.0"
  - Fix error messages typo

# 0.1.0 (Aug 12th 2025)

  - Initial release
