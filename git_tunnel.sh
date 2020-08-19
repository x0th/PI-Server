#!/bin/bash

tun=$(head -1 /home/pi/telegram.bot/tunnels.txt)
git -C /home/pi/server_public/ reset --hard $1
git -C /home/pi/server_public/ push origin +$1^:master
git -C /home/pi/server_public/ push origin $1:master

sed -i 's/___tunnel___/https\:\/\/'"$tun"'/g' /home/pi/server_public/README.md

git -C /home/pi/server_public/ add .
git -C /home/pi/server_public/ commit -m "Tunnel refresh"
git -C /home/pi/server_public/ push origin master
