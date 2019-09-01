import PluginRepository from "../../plugins/PluginRepository";
import KeyPairService from "./KeyPairService";
import HardwareService from "./HardwareService";

let signer;
export default class SigningService {

	static init(_signer){
		signer = _signer;
	}

	static sign(network, payload, publicKey, arbitrary = false, isHash = false){
		// payload, publicKey, arbitrary = false, isHash = false, account = null
		if(!signer){
			if(KeyPairService.isHardware(publicKey)){
				return HardwareService.sign(network, publicKey, payload);
			} else return PluginRepository.plugin(network.blockchain).signer(payload, publicKey, arbitrary, isHash);
		} else return signer(network, publicKey, payload, arbitrary, isHash);
	}

}