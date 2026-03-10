#!/bin/sh
rsync -avz --delete --exclude .git --exclude node_modules --exclude dist "$(dirname "$0")/" tibiatools:/var/www/tibiatools/
