"use strict";

let { ServiceBroker } 	= require("moleculer");
let REPL 				= require("../../src");

// Create broker
let broker = new ServiceBroker({
	nodeID: "repl-" + process.pid,
	transporter: "TCP",
	logger: console,
	cacher: true,

	// Custom REPL command
	replCommands: [
		{
			command: "hello <name>",
			description: "Call the greeter.hello service with name",
			alias: "hi",
			options: [
				{ option: "-u, --uppercase", description: "Uppercase the name" }
			],
			types: {
				string: ["name"],
				boolean: ["u", "uppercase"]
			},
			//parse(command, args) {},
			//validate(args) {},
			//help(args) {},
			allowUnknownOptions: true,
			action(args) {
				return broker.call("greeter.hello", { name: args.name }).then(console.log);
			}
		}
	]
});

broker.createService({
	name: "greeter",
	actions: {
		hello: {
			cache: true,
			handler(ctx) {
				return "Hello " + ctx.params.name;
			}
		},
		welcome(ctx) {
			return {
				params: ctx.params,
				welcomedAt: Date.now()
			};
		}
	},
	events: {
		"user.created"(payload) {
			this.logger.info("User created even received!", payload);
		},
		"order.created": {
			group: "order",
			handler(payload) {
				this.logger.info("User created even received!", payload);
			}
		},
		"$local-event"(payload) {
			this.logger.info("Local event received!", payload);
		}
	}
});


broker.createService({
	name: "math",
	actions: {
		add(ctx) {
			return Number(ctx.params.a) + Number(ctx.params.b);
		}
	}
});

broker.start().then(() => REPL(broker, broker.options.replCommands));
