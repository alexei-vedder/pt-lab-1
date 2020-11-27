const fs = require("fs");

export class FSWorker {
 	async readDataFromFile(path): Promise<any> {}
	async writeDataToFile(data, path): Promise<void> {}
}

export class JSONFileWorker extends FSWorker {

	/**
	 * file format should be .json and all the data should be contained into "data".
	 * Example: { "data": "1001010" }
	 * @param path
	 * @returns {Promise<string>}
	 */
	async readDataFromFile(path): Promise<any> {
		return new Promise(resolve => {
			fs.readFile(path, (error, buffer) => {
				console.log(`File ${path} has been successfully read`);
				resolve(this.extractData(buffer));
			});
		});
	}

	/**
	 * @param data
	 * @param path
	 * @returns {Promise<void>}
	 */
	async writeDataToFile(data, path = "out.json"): Promise<void> {
		return new Promise((resolve, reject) => {
			fs.writeFile(path, this.packData(data), error => {
				if (error) {
					console.log(error);
					reject();
				} else {
					console.log(`File ${path} has been successfully written`);
					resolve();
				}
			})
		})
	}

	/**
	 * @param buffer {any}
	 * @returns {string}
	 */
	private extractData(buffer) {
		return JSON.parse(buffer);
	}

	/**
	 * @param data {any}
	 * @returns {string}
	 */
	private packData(data) {
		return JSON.stringify(data);
	}
}
