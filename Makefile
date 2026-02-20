# Makefile for padKontrol Cubase MIDI Remote Script

WORKSPACE_FILE = src/korg_padkontrol.js
CUBASE_LOCAL_DIR = $(HOME)/Documents/Steinberg/Cubase/MIDI Remote/Driver Scripts/Local/Korg/padKontrol
CUBASE_FILE = $(CUBASE_LOCAL_DIR)/Korg_padKontrol.js

.PHONY: deploy clean help

help:
	@echo "Available targets:"
	@echo "  make deploy - Copies script to $(CUBASE_LOCAL_DIR)"
	@echo "  make clean  - Removes the file from $(CUBASE_LOCAL_DIR)"

deploy:
	@echo "Creating directories..."
	@mkdir -p "$(CUBASE_LOCAL_DIR)"
	@echo "Deploying to '$(CUBASE_LOCAL_DIR)'"
	@cp "$(WORKSPACE_FILE)" "$(CUBASE_FILE)"
	@echo "Done!"

clean:
	@echo "Removing script from '$(CUBASE_LOCAL_DIR)'"
	@rm -f "$(CUBASE_FILE)"
