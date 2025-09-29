#!/bin/bash

# Download nano text editor ( Ubuntu Minimal does not come with a text editor)
sudo snap install nano --classic

# Make the setup script 
nano setup_script.sh
# Paste the following content of server-deploy-setup.sh and save the file

# Give execute permission
chmod +x setup_script.sh 

# Run the setup script
./setup_script.sh

