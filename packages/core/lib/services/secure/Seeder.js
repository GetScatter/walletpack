let seeder;
export default class Seeder {

	static init(_seeder){
		seeder = _seeder;
	}

	static async getSalt(){
		return seeder.getSalt();
	}

	static async getSeed(){
		return seeder.get();
	}

	static async setSeed(seed){
		return seeder.set(seed);
	}

	static async clear(){
		return seeder.clear();
	}

}