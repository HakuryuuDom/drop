module.exports = function Drop(mod) {

	let location = null,
		locRealTime = 0,
		curHp = 0,
		maxHp = 0,
		cooldown = false

	function DropHP(dropPercent) {
		let percent = Number(dropPercent);

		if(isNaN(percent)) {
			mod.command.message('Error: ' + dropPercent + ' is not a number.')
			return mod.settings.defaultPercent;
		}
		if(!(percent > 0 && percent <= 100) || !curHp) {
			mod.command.message('Error: ' + percent.toString() + '% is not between 1% and 100%, or Current HP is unknown.')
			return mod.settings.defaultPercent;
		}
		if(cooldown) {
			mod.command.message('Error: Please wait ' + mod.settings.dropCooldown.toString() + ' seconds before using the command again.')
			mod.command.message('Use /8 drop cooldown (seconds) to change this value.')
			return percent;
		}
		let percentToDrop = (curHp * 100 / maxHp) - percent;

		if(percentToDrop <= 0) {
			mod.command.message('Error: Cannot drop to a value above or equal to your current HP.')
			return mod.settings.defaultPercent;
		}
		mod.command.message('Dropping to ' + percent.toString() + '% HP.');
		cooldown = true;
		setTimeout(() => {
			cooldown = false
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

	mod.hook('S_PLAYER_STAT_UPDATE', 9, event => {
		curHp = event.hp;
		maxHp = event.maxHp;
	});

	mod.hook('S_CREATURE_CHANGE_HP', 6, event => {
		if(mod.game.me.is(event.target)) {
			curHp = event.curHp;
			maxHp = event.maxHp;
		}
	});

	mod.hook('C_PLAYER_LOCATION', 5, event => {
		location = event;
		locRealTime = Date.now();
	});

	mod.command.add('drop', (...args) => {
		switch(args[0]) {
			case undefined:
			case null:
			case '':
				if(!mod.settings.defaultPercent) {
					mod.command.message('Please input a percent to drop to. Your desired choice will be saved for future use.')
					return;
				}
				DropHP(mod.settings.defaultPercent);
				break
			case 'cooldown':

				if(!args[1]) {
					mod.command.message('Cooldown: ' + mod.settings.dropCooldown)
					return
				}
				let cd = Number(args[1])
				if(isNaN(cd)) {
					mod.command.message('Error: ' + args[1] + ' is not a number.')
					return
				}
				if(args[1] >= 0 && args[1] < 60) {
					mod.command.message('Cooldown set to: ' + cd.toString())
					mod.settings.dropCooldown = cd;
					mod.saveSettings();
				} else {
					mod.command.message('Error: Cooldown must be between 0 and 60 seconds.')
				}
				break
			default:
				mod.settings.defaultPercent = DropHP(args[0])
				mod.saveSettings();
				break
		}
	})
	this.destructor = () => {mod.command.remove('drop')};
};