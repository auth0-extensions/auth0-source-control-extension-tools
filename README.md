[![CircleCI](https://circleci.com/gh/auth0-extensions/auth0-source-control-extension-tools.svg?style=svg)](https://circleci.com/gh/auth0-extensions/auth0-source-control-extension-tools)
[![npm version](https://badge.fury.io/js/auth0-source-control-extension-tools.svg)](https://badge.fury.io/js/auth0-source-control-extension-tools)

# Auth0 - Source Control Extension Tools

## v6.x drops support for Node 8

Node 8 is no longer supported start from v6.0.0


## v5.x supports only `auth0-deploy-cli`

**NOTE**: Starting from v5.0.0, only `auth0-deploy-cli` will be supported.


## v4.x and earlier
Shared logic for the Source Control Extensions and CLI:

- https://github.com/auth0-extensions/auth0-deploy-extensions
- https://github.com/auth0/auth0-deploy-cli

# Deployment

Deployment is done via git tags being pushed on master.

We let the [release-drafter](https://github.com/apps/release-drafter) bot handle this by updating the release to publish. This will create the tag and trigger the build/deployment.
