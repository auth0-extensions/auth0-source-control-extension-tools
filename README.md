[![CircleCI](https://circleci.com/gh/auth0-extensions/auth0-source-control-extension-tools.svg?style=svg)](https://circleci.com/gh/auth0-extensions/auth0-source-control-extension-tools)
[![npm version](https://badge.fury.io/js/auth0-source-control-extension-tools.svg)](https://badge.fury.io/js/auth0-source-control-extension-tools)
[![Test Coverage](https://api.codeclimate.com/v1/badges/275aadc77dccd6ed6a24/test_coverage)](https://codeclimate.com/github/auth0-extensions/auth0-source-control-extension-tools/test_coverage)

# Auth0 - Source Control Extension Tools

Shared logic for the Source Control Extensions and CLI:

- https://github.com/auth0-extensions/auth0-deploy-extensions
- https://github.com/auth0/auth0-deploy-cli

# Deployment

Deployment is done via git tags being pushed on master.

We let the [release-drafter](https://github.com/apps/release-drafter) bot handle this by updating the release to publish. This will create the tag and trigger the build/deployment.
