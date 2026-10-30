#!/bin/sh

if test -z "$XDG_RUNTIME_DIR"; then 
	export XDG_RUNTIME_DIR=/run/user/`id -u`
	if ! test -d "$XDG_RUNTIME_DIR"; then 
		mkdir --parents $XDG_RUNTIME_DIR
		chmod 0700 $XDG_RUNTIME_DIR
	fi
fi

# wait for weston 
#while [ ! -e $XDG_RUNTIME_DIR/wayland-1 ] ; echo '$XDG_RUNTIME_DIR/wayland-1';do sleep 0.1; done
#sleep 1

export WAYLAND_DISPLAY="wayland-1"

/usr/bin/node /tamarus10/server.js &

#check if parameters are set already
SERVICE="$(systemctl is-active systemd-timesyncd)"
if [ "${SERVICE}" = "active" ]
then
	#assume all other services and parameters need to be set
	echo "Optimising parameters for quicker startup"
	
	sleep 3
	
	#set up U-Boot environment variables
	fw_setenv setup 'setenv setupargs console=null,${baudrate} consoleblank=0 earlycon'
	fw_setenv defargs vt.global_cursor_default=0
	fw_setenv tdxargs '${tdxargs} quiet'
	fw_setenv bootdelay 0
	
	sleep 3
	
	#turn off unused services
	systemctl stop getty@tty1.service
	systemctl disable getty@tty1.service
	echo "disable getty@tty1.service"
	sleep 3

	systemctl stop ofono.service
	systemctl disable ofono.service
	echo "disable ofono.service"

	systemctl stop usbg.service
	systemctl disable usbg.service
	echo "disable usbg.service"
	sleep 3

	systemctl stop alsa-restore.service
	systemctl mask alsa-restore.service
	echo "disable alsa-restore.service"
	sleep 3

	systemctl stop systemd-resolved.service
	systemctl disable systemd-resolved.service
	echo "disable systemd-resolved.service"
	sleep 3

	systemctl stop systemd-udev-settle.service
	systemctl mask systemd-udev-settle.service
	echo "disable systemd-udev-settle.service"
	sleep 3

	systemctl stop avahi-daemon.service
	systemctl disable avahi-daemon.service
	echo "disable avahi-daemon.service"
	sleep 3
	
	#set weston to kiosk mode
	if grep -wq "#shell=desktop-shell.so" /etc/xdg/weston/weston.ini  #if not currently set to kiosk mode
	then
		echo "Set to Kiosk Mode"
		while IFS='' read -r a; do	#set to kiosk mode
		    echo "${a//#shell=desktop-shell.so/shell=kiosk-shell.so}"
		done < /etc/xdg/weston/weston.ini > /etc/xdg/weston/weston.ini.t
		mv /etc/xdg/weston/weston.ini{.t,}
		sleep 5
	fi

	systemctl stop systemd-timesyncd.service
	systemctl disable systemd-timesyncd.service

	sleep 3

	echo "finished optimisation"

	sleep 3
	reboot
fi