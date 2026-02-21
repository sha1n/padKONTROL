# Makefile for padKontrol Cubase MIDI Remote Script

WORKSPACE_FILE = src/korg_padkontrol.js
CUBASE_LOCAL_DIR = $(HOME)/Documents/Steinberg/Cubase/MIDI Remote/Driver Scripts/Local/Korg/padKONTROL
CUBASE_FILE = $(CUBASE_LOCAL_DIR)/Korg_padKONTROL.js

.PHONY: deploy verify clean help

help:
	@echo "Available targets:"
	@echo "  make verify - Checks the script for syntax errors"
	@echo "  make deploy - Copies script to $(CUBASE_LOCAL_DIR)"
	@echo "  make clean  - Removes the file from $(CUBASE_LOCAL_DIR)"

verify:
	@echo "Verifying script syntax..."
	@node --check "$(WORKSPACE_FILE)"
	@echo "OK"

deploy: verify
	@echo "Creating directories..."
	@mkdir -p "$(CUBASE_LOCAL_DIR)"
	@echo "Deploying to '$(CUBASE_LOCAL_DIR)'"
	@cp "$(WORKSPACE_FILE)" "$(CUBASE_FILE)"
	@echo "Done!"

clean:
	@echo "Removing script from '$(CUBASE_LOCAL_DIR)'"
	@rm -f "$(CUBASE_FILE)"
