# opentrons component library makefile

# use bash
SHELL := bash

# use devDependency CLIs with $(bin)/command
# set NODE_ENV for a command with $(env)=environment
bin := node_modules/.bin
env := $(bin)/cross-env NODE_ENV

# dev server port
port ?= 8081

# watch, coverage, and fix variables for tests and linting
watch ?= false
cover ?= true
updateSnapshot ?= false
fix ?= false
ifeq ($(watch), true)
	cover := false
endif

# standard targets
#####################################################################

.PHONY: install
install:
	yarn

.PHONY: uninstall
uninstall:
	rm -rf node_modules

	# artifacts
	#####################################################################

.PHONY: build
build:
	$(env)=development $(bin)/styleguidist build

# development
#####################################################################

.PHONY: dev
dev:
	$(env)=development $(bin)/styleguidist server

# checks
#####################################################################

.PHONY: test
test:
	$(env)=test $(bin)/jest \
		--coverage=$(cover) \
		--watch=$(watch) \
		--updateSnapshot=$(updateSnapshot)
	$(MAKE) check lint

.PHONY: check
check:
	$(bin)/flow

.PHONY: install-types
install-types:
	$(bin)/flow-typed install --ignoreDeps dev

.PHONY: uninstall-types
uninstall-types:
	rm -rf flow-typed

.PHONY: lint
lint:
	$(bin)/standard --verbose --fix=$(fix) | $(bin)/snazzy
	$(bin)/stylelint '**/*.css' --fix=$(fix) --verbose
