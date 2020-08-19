#!/bin/bash

vcgencmd measure_temp | egrep -o '[0-9]*\.[0-9]*' > /home/pi/telegram.bot/temperature.txt
