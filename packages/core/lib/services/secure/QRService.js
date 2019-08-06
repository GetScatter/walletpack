import QRCode from 'qrcode';
import AES from 'aes-oop';
import Mnemonic from '../../util/Mnemonic'
import Seeder from "./Seeder";

export default class QRService {

    static createQR(data, pass = null){
        return new Promise(async resolve => {
	        if(!pass || !pass.length) {
		        resolve(QRCode.toDataURL(JSON.stringify({data, salt: Seeder.getSalt()}), {errorCorrectionLevel: 'L'}));
	        } else {
		        const oldSeed = await Seeder.getSeed();
		        const newSeed = (await Mnemonic.generateMnemonic(pass, Seeder.getSalt()))[1];
		        const dData = AES.encrypt(AES.decrypt(data, oldSeed), newSeed);
		        resolve(QRCode.toDataURL(JSON.stringify({data:dData, salt: Seeder.getSalt()}), {errorCorrectionLevel: 'L'}));
	        }
        })
    }

    static async createUnEncryptedQR(data){
        return QRCode.toDataURL(JSON.stringify(data), {errorCorrectionLevel: 'L'});
    }

    static async decryptQR(data, salt, password){
        const [mnemonic, seed] = await Mnemonic.generateMnemonic(password, salt);
        try {
	        return AES.decrypt(data, seed)
        } catch(e){
        	console.error('Error decrypting QR: ', e);
        	return null;
        }
    }

}