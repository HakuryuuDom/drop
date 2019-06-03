module.exports = function Drop(mod) {
	const command = mod.command;

	let location = null,
		locRealTime = 0,
		curHp = 0,
		maxHp = 0,
		cooldown = false,
		afkMode = false;

	function parseArgs(configOption, data, name) {
		let input = Number(data);
		if(isNaN(input)) {
			command.message(name + ': ' + configOption.toString());
			return configOption;
		} 
		else if(input <= 0 && input >= 100) {
			command.message('Error: ' + name + ' cannot be negative, zero, or greater than 100.');
			return configOption;
		}
		else {
			command.message(name + ' set to: ' + input.toString() + '.');
			return input;
		}
	}

	function dropHP(dropPercent) {
		let percent = Number(dropPercent);

		if(isNaN(percent)) {
			command.message('Error: ' + dropPercent + ' is not a number.');
			return mod.settings.defaultPercent;
		}
		if(!(percent > 0 && percent <= 100) || !curHp) {
			command.message('Error: ' + percent.toString() + '% is not between 1% and 100%, or Current HP is unknown.');
			return mod.settings.defaultPercent;
		}
		if(cooldown) {
			command.message('Error: Please wait ' + mod.settings.dropCooldown.toString() + ' seconds before using the command again.');
			command.message('Use /8 drop cooldown (seconds) to change this value.');
			return percent;
		}
		let percentToDrop = (curHp * 100 / maxHp) - percent;

		if(percentToDrop <= 0) {
			command.message('Error: Cannot drop to a value above or equal to your current HP.');
			return mod.settings.defaultPercent;
		}
		command.message('Dropping to ' + percent.toString() + '% HP.');
		cooldown = true;
		setTimeout(() => {
			cooldown = false;
			if(afkMode && (curHp * 100 / maxHp >= mod.settings.afkMax) && !mod.game.me.inCombat) {
				dropHP(mod.settings.afkMin);
			}
		}, mod.settings.dropCooldown * 1000);
		

		mod.send('C_PLAYER_LOCATION', 5, Object.assign({}, location, {
			loc: location.loc.addN({z: 400 + percentToDrop * (mod.game.me.race === 'castanic' ? 20 : 10)}),
			type: 2,
			time: location.time - locRealTime + Date.now() - 50
		}));
		mod.send('C_PLAYER_LOCATION', 5, Object.assign(location, {
			type: 7,
			time: location.time - locRealTime + Date.now() + 50
		}));
		return percent;
	}

	mod.hook('S_PLAYER_STAT_UPDATE', 12, event => {
		curHp = Number(event.hp); //player hp can never be above 2.147B, so we dont need to use BigInt
		maxHp = Number(event.maxHp);
	});

	mod.hook('S_CREATURE_CHANGE_HP', 6, event => {
		if(mod.game.me.is(event.target)) {
			curHp = Number(event.curHp);
			maxHp = Number(event.maxHp);
			if(afkMode && (curHp * 100 / maxHp >= mod.settings.afkMax) && !cooldown) {
				if(mod.game.me.inCombat) {
					afkMode = false;
					command.message('You are in combat. Disabling afkmode.');
					return;
				}
				dropHP(mod.settings.afkMin);
			}
		}
	});

	mod.hook('C_PLAYER_LOCATION', 5, event => {
		location = event;
		locRealTime = Date.now();
	});

	command.add(['drop','slay', 'slaying'], (...args) => {
		switch(args[0]) {
		case undefined:
		case null:
		case '':
			if(!mod.settings.defaultPercent) {
				command.message('Please input a percent to drop to. Your desired choice will be saved for future use.');
				return;
			}
			dropHP(mod.settings.defaultPercent);
			break;
		case 'cooldown':

			if(!args[1]) {
				command.message('Cooldown: ' + mod.settings.dropCooldown.toString());
				return;
			}
			var cd = Number(args[1]);
			if(isNaN(cd)) {
				command.message('Error: ' + args[1] + ' is not a number.');
				return;
			}
			if(args[1] >= 0 && args[1] < 60) {
				command.message('Cooldown set to: ' + cd.toString());
				mod.settings.dropCooldown = cd;
				mod.saveSettings();
			} else {
				command.message('Error: Cooldown must be between 0 and 60 seconds.');
			}
			break;
		case 'afk':
			if(mod.settings.afkMin >= mod.settings.afkMax) {
				command.message('Error: Afk Min must be lower than Afk Max.');
				return;
			}
			afkMode = !afkMode;
			command.message('AFK Mode ' + (afkMode ? 'en' : 'dis') + 'abled.');
			command.message('This feature is experimental and may cause DCs.');
			if(afkMode && (curHp * 100 / maxHp >= mod.settings.afkMax)) {
				dropHP(mod.settings.afkMin);
			}
			break;
		case 'afkmin':
			mod.settings.afkMin = parseArgs(mod.settings.afkMin, args[1], 'Afk Min');
			mod.saveSettings();
			break;
		case 'afkmax':
			mod.settings.afkMax = parseArgs(mod.settings.afkMax, args[1], 'Afk Max');
			mod.saveSettings();
			break;

		default:
			mod.settings.defaultPercent = dropHP(args[0]);
			mod.saveSettings();
			break;
		}
	});
	this.destructor = () => {command.remove(['drop', 'slay', 'slaying']);};
};