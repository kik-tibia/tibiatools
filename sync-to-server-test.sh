#!/bin/sh
git -C "$(dirname "$0")" rev-parse HEAD > "$(dirname "$0")/public/version.txt"
rsync -avz --delete --exclude .git --exclude .jj --exclude node_modules --exclude dist "$(dirname "$0")/" tibiatools:/var/www/tibiatools-test/
