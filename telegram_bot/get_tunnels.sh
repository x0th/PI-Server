#!/bin/bash

curl --silent http://127.0.0.1:4040/api/tunnels | sed -nE 's/.*public_url":"https:..([^"]*).*/\1/p' >> /home/pi/telegram.bot/tunnels.txt
curl --silent http://127.0.0.1:4040/api/tunnels | sed -nE 's/.*public_url":"tcp:.................([^"]*).*/\1/p' >> /home/pi/telegram.bot/tunnels.txt
