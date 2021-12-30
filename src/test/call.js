"use strict";

const parse = require("yargs-parser");
const kleur = require("kleur");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const util = require("util");
const { convertArgs } = require("../utils");
const humanize = require("tiny-human-time").short;
const isStream = require("is-stream");

/**
 * Command logic
 * @param {import("moleculer").ServiceBroker} broker Moleculer's Service Broker
 * @param {Object} args Parsed arguments
 */
async function handler(broker, args) {
	let payload;
	let meta = {};
	console.log(args);
	if (typeof args.jsonParams == "string") {
		try {
			payload = JSON.parse(args.jsonParams);
		} catch (err) {
			console.error(
				kleur.red().bold(">> ERROR:", err.message, args.jsonParams)
			);
			console.error(kleur.red().bold(err.stack));
			return;
		}
	} else {
		payload = {};

		const opts = convertArgs(args.options);
		if (args.options.save) delete opts.save;

		Object.keys(opts).map((key) => {
			if (key.startsWith("#")) meta[key.slice(1)] = opts[key];
			else {
				if (key.startsWith("@")) payload[key.slice(1)] = opts[key];
				else payload[key] = opts[key];
			}
		});
	}

	if (typeof args.meta === "string") {
		try {
			meta = JSON.parse(args.meta);
		} catch (err) {
			console.error(kleur.red().bold("Can't parse [meta]"), args.meta);
			return;
		}
	}

	// Load payload from file
	if (args.options.load) {
		let fName;
		if (_.isString(args.options.load)) {
			fName = path.resolve(args.options.load);
		} else {
			fName = path.resolve(`${args.actionName}.params.json`);
		}
		if (fs.existsSync(fName)) {
			console.log(kleur.magenta(`>> Load params from '${fName}' file.`));
			payload = JSON.parse(fs.readFileSync(fName, "utf8"));
		} else {
			console.log(kleur.red(">> File not found:", fName));
		}
	}

	// Load payload from file as stream
	if (args.options.stream) {
		let fName;
		if (_.isString(args.options.stream)) {
			fName = path.resolve(args.options.stream);
		} else {
			fName = path.resolve(`${args.actionName}.stream`);
		}
		if (fs.existsSync(fName)) {
			console.log(kleur.magenta(`>> Load stream from '${fName}' file.`));
			payload = fs.createReadStream(fName);
		} else {
			console.log(kleur.red(">> File not found:", fName));
		}
	}

	const startTime = process.hrtime();
	const nodeID = args.nodeID;
	meta.$repl = true;
	console.log(
		kleur
			.yellow()
			.bold(
				`>> Call '${args.actionName}'${nodeID ? " on " + nodeID : ""}`
			),
		isStream(payload) ? "with <Stream>." : "with params:",
		isStream(payload) ? "" : payload
	);

	try {
		const res = await broker.call(args.actionName, payload, {
			meta,
			nodeID,
		});

		const diff = process.hrtime(startTime);
		const duration = (diff[0] + diff[1] / 1e9) * 1000;
		console.log(
			kleur.cyan().bold(">> Execution time:" + humanize(duration))
		);

		console.log(kleur.yellow().bold(">> Response:"));
		if (isStream(res)) {
			console.log("<Stream>");
		} else {
			console.log(
				util.inspect(res, {
					showHidden: false,
					depth: 4,
					colors: true,
				})
			);
		}

		// Save response to file
		if (args.options.save && res != null) {
			let fName;
			if (_.isString(args.options.save)) {
				fName = path.resolve(args.options.save);
			} else {
				fName = path.join(".", `${args.actionName}.response`);
				if (isStream(res)) fName += ".stream";
				else fName += _.isObject(res) ? ".json" : ".txt";
			}

			if (isStream(res)) {
				res.pipe(fs.createWriteStream(fName));
			} else {
				fs.writeFileSync(
					fName,
					_.isObject(res) ? JSON.stringify(res, null, 4) : res,
					"utf8"
				);
			}
			console.log(
				kleur
					.magenta()
					.bold(`>> Response has been saved to '${fName}' file.`)
			);
		}
	} catch (err) {
		console.error(kleur.red().bold(">> ERROR:", err.message));
		console.error(kleur.red().bold(err.stack));
		console.error(
			"Data: ",
			util.inspect(err.data, {
				showHidden: false,
				depth: 4,
				colors: true,
			})
		);
	}
}

/**
 * Command option declarations
 * @param {import("commander").Command} program Commander
 * @param {import("moleculer").ServiceBroker} broker Moleculer's Service Broker
 */
module.exports = function (program, broker) {
	// Register call command
	program
		.command("call <actionName> [jsonParams] [meta]")
		.description("Call an action")
		.option("--load [filename]", "Load params from file")
		.option("--stream [filename]", "Send a file as stream")
		.option("--save [filename]", "Save response to file")
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.hook("preAction", (thisCommand) => {
			const [actionName, ...args] = thisCommand.args;
			// Parse the unknown args + args that commander.js managed to process
			let parsedArgs = { ...parse(args), ...thisCommand._optionValues };
			delete parsedArgs._;

			// Set the params
			thisCommand.params = {
				options: parsedArgs,
				actionName,
				rawCommand: thisCommand.args.join(" "),
			};
		})
		.action(async function () {
			// Get the params
			await handler(broker, this.params);

			// Clear the parsed values for next execution
			this._optionValues = {};
		});

	// Register dcall command
	program
		.command("dcall <nodeID> <actionName> [jsonParams] [meta]")
		.description("Direct call an action")
		.option("--load [filename]", "Load params from file")
		.option("--stream [filename]", "Send a file as stream")
		.option("--save [filename]", "Save response to file")
		.allowUnknownOption(true)
		.allowExcessArguments(true)
		.hook("preAction", (thisCommand) => {
			const [nodeID, actionName, ...args] = thisCommand.args;
			// Parse the unknown args + args that commander.js managed to process
			let parsedArgs = { ...parse(args), ...thisCommand._optionValues };
			delete parsedArgs._;

			// Set the params
			thisCommand.params = {
				options: parsedArgs,
				actionName,
				nodeID,
				rawCommand: thisCommand.args.join(" "),
			};
		})
		.action(async function () {
			// Get the params
			await handler(broker, this.params);

			// Clear the parsed values for next execution
			this._optionValues = {};
		});
};
