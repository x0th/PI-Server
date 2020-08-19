const LocalStrategy = require('passport-local').Strategy;

function initialize(passport, getUserByName, getUserById) {
	const authenticateUser = async function(username, password, done) {
		const user = getUserByName(username);
		if (user == null)
			return done(null, false, { message: 'Username or password incorrect' });

		if (password == user.password)
			return done(null, user);
		else
			return done(null, false, { message: 'Username or password incorrect' });
	};

	passport.use(new LocalStrategy({ usernameField: 'name' },authenticateUser));
	passport.serializeUser(function (user, done) { done(null, user.id); });
	passport.deserializeUser(function (id, done) { return done(null, getUserById(id)); });
}

module.exports = initialize;
