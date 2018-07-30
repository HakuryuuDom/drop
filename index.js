module.exports = function Drop(mod) {

	let location = null,
		locRealTime = 0,
		curHp = 0,
		maxHp = 0;

	mod.hook('S_PLAYER_STAT_UPDATE', 9, event => {
		curHp = event.hp;
		maxHp = event.maxHp;
	});

	mod.hook('S_CREATURE_CHANGE_HP', 6, event => {
		if(mod.game.me.is(event.target)) {
			curHp = event.curHp;
			maxHp = event.maxHp;
		};
	});

	mod.hook('C_PLAYER_LOCATION', 5, event => {
		location = event;
		locRealTime = Date.now();
	});

	mod.command.add('drop', percent => {
		percent = Number(percent);

		if(!(percent > 0 && percent <= 100) || !curHp) return;

		let percentToDrop = (curHp * 100 / maxHp) - percent;

		if(percentToDrop <= 0) return;

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