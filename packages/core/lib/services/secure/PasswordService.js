export default class PasswordService {

	static isLongEnough(password, suggested = 8){
		return password.length >= suggested;
	}

	static uppercaseCount(password){
		return password.split('').filter(x => x === x.toUpperCase()).length;
	}

	static lowercaseCount(password){
		return password.split('').filter(x => x !== x.toUpperCase()).length;
	}

	static specialCharCount(password){
		return password.replace(/[0-9a-zA-Z]/gi, '').length;
	}

	static hasError(password){
		if(!this.isLongEnough(password)) return 'Your password is not long enough (8 characters)';
		if(this.uppercaseCount(password) < 2) return `Passwords must have at least two uppercase letters`;
		if(this.lowercaseCount(password) < 2) return `Passwords must have at least two lowercase letters`;
		if(this.specialCharCount(password) < 2) return `Passwords must have at least two special characters (like # or @)`;
		return false;
	}

}