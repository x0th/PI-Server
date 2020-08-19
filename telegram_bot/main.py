#!/bin/python3
import os
import telegram
from datetime import datetime

def get_tun():
	os.system("rm /home/pi/telegram.bot/tunnels.txt;touch /home/pi/telegram.bot/tunnels.txt;sudo /home/pi/telegram.bot/get_tunnels.sh")
	with open('/home/pi/telegram.bot/tunnels.txt', 'r') as f:
		ret = 'URL: https://'
		ret+= f.readline()
		ret+= 'SSH Port: '
		ret+= f.readline()
	f.close()
	return ret

def get_load():
	os.system("/home/pi/telegram.bot/get_load.sh")
	with open('/home/pi/telegram.bot/load.txt', 'r') as f:
		ret = 'System disk load: '
		f.readline()
		ret += f.readline()
	f.close()
	return ret

def get_temp():
	os.system("/home/pi/telegram.bot/get_temperature.sh")
	with open('/home/pi/telegram.bot/temperature.txt', 'r') as f:
		ret = 'System temperature: '
		ret += f.readline().strip()
		ret += '\U000000B0C'
	f.close()
	return ret

def main():
	bot = telegram.Bot(token='*redacted_bot_token*')

	# header
	out = '\U00002757\U00002757\U00002757\nGlorious x0th server info!\n'

	# system info
	out += '\n\U0001F4BB\U0001F4BB\U0001F4BB\n'
	out += "System time: " + datetime.now().strftime("%d/%m/%Y %H:%M:%S\n")
	out += get_load()
	out += get_temp() + "\n"

	# tunnel info
	out += '\n\U0001F30E\U0001F30E\U0001F30E\n'
	out += get_tun()

	# tail
	out += '\n\U0000274E\U0000274E\U0000274E'

	bot.send_message(chat_id=0x0badf00d, text=out)

if __name__ == "__main__":
	main()
