#!/bin/python3
import telegram
import os
import time

def get_logs():
        with open('/home/pi/telegram.bot/logs.txt', 'r') as f:
                ret = f.read()
        f.close()
        return ret

def main():
	os.system("logwatch --detail 0 --range Yesterday --output file --filename /home/pi/telegram.bot/logs.txt --service http --service sshd --service sudo --service pam_unix")
	time.sleep(300)

	bot = telegram.Bot(token='*redacted_bot_token*')
	bot.send_message(chat_id=0x0badf00d, text=get_logs())


if __name__ == "__main__":
        main()
