module.exports = function Drop(mod) {

	let location = null,
		locRealTime = 0,
		curHp = 0,
		maxHp = 0,
		cooldown = false

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

	mod.command.add('drop', percent => {
		if(!percent) {
			if(!mod.settings.defaultPercent) {
				mod.command.message('Please input a percent to drop. Your desired choice will be saved for future use.')
				return;
			}
			percent = mod.settings.defaultPercent //load from config
		}
		if(cooldown) {
			mod.command.message('Error: Please wait '+ mod.settings.dropCooldown.toString() + ' seconds to use the command again, this is to protect you from disconnecting.');
			mod.command.message('You can change this value in config.json.');
			return;
		}
		percent = Number(percent);

		if(!(percent > 0 && percent <= 100) || !curHp) {
			mod.command.message('Error: ' + percent.toString() + '% is not between 1% and 100%, or Current HP is unknown.')
			return;
		}
		
		let percentToDrop = (curHp * 100 / maxHp) - percent;

		if(percentToDrop <= 0) {
			mod.command.message('Error: Cannot drop to a value above or equal to your current HP.')
			return;
		}
		mod.settings.defaultPercent = percent //save to config
		if(mod.settings.firstUse) {
			mod.command.message('New Update! Your percent to drop has been saved. You may now use /8 drop (without a number) to drop your HP to the saved percent.')
			mod.settings.firstUse = false;
		}

		mod.command.message('Dropping to ' + percent.toString() + '% HP. Please wait ' + mod.settings.dropCooldown.toString() + ' seconds before using the command again.');
		mod.command.message('You can change this value in config.json.');
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
	});
	this.destructor = () => {mod.command.remove('drop')};
};