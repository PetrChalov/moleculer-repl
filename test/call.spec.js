"use strict";

const { ServiceBroker } = require("moleculer");
const commander = require("commander");
const { parseArgsStringToArgv } = require("string-argv");

// Load the command declaration
let { declaration } = require("../src/commands/call");

describe("Test 'call' command", () => {
	let program;
	let broker;

	// Mock the handler
	const cmdHandler = jest.fn();

	beforeAll(() => {
		program = new commander.Command();
		program.exitOverride();
		program.allowUnknownOption(true);

		program.showHelpAfterError(true);
		program.showSuggestionAfterError(true);

		// Create broker
		broker = new ServiceBroker({
			nodeID: "repl-" + process.pid,
			logger: false,
		});

		// Register the command
		declaration(program, broker, cmdHandler);
	});

	afterEach(() => {
		cmdHandler.mockClear();
	});

	it("should call 'call' with simple and nested params", async () => {
		const command =
			"call greeter.hello --a 5 --b Bob --c --no-d --e.f hello";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: 5,
				b: "Bob",
				c: true,
				d: false,
				e: { f: "hello" },
			},
			actionName: "greeter.hello",
			rawCommand:
				"call greeter.hello --a 5 --b Bob --c --no-d --e.f hello",
		});
	});

	it("should call 'call' with arrays", async () => {
		const command = "call greeter.hello --a 5 --a 6 --b 8 --b 12";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: [5, 6],
				b: [8, 12],
			},
			actionName: "greeter.hello",
			rawCommand: "call greeter.hello --a 5 --a 6 --b 8 --b 12",
		});
	});

	it("should call 'call' and NOT parse the values", async () => {
		// example from: https://github.com/moleculerjs/moleculer-repl/issues/54

		const command = 'call user.create --phone "+1111111" --passcode "0033"';

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: { phone: "+1111111", passcode: "0033" },
			actionName: "user.create",
			rawCommand: "call user.create --phone +1111111 --passcode 0033",
		});
	});

	it("should call 'call' and keep hexadecimals as string", async () => {
		// example adapted from: https://github.com/moleculerjs/moleculer-repl/issues/47

		const command =
			"call greeter.hello --a 5 --a 6 --hash 0x7597 --b 8 --b 12 --traceHash 0xab706 --c testString";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: [5, 6],
				b: [8, 12],
				c: "testString",
				hash: "0x7597",
				traceHash: "0xab706",
			},
			actionName: "greeter.hello",
			rawCommand:
				"call greeter.hello --a 5 --a 6 --hash 0x7597 --b 8 --b 12 --traceHash 0xab706 --c testString",
		});
	});

	it("should call 'call' with JSON string parameter", async () => {
		const command = `call "math.add" '{"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } }' '{"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }'`;

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {},
			actionName: "math.add",
			jsonParams:
				'{"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } }',
			meta: '{"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }',
			rawCommand: `call math.add {"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } } {"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }`,
		});
	});

	it("should call 'call' flags", async () => {
		const command = `call "math.add" --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json`;

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				load: "my-params.json",
				stream: "my-picture.jpg",
				save: "my-response.json",
				loadFull: "params.json",
			},
			actionName: "math.add",
			rawCommand:
				"call math.add --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json",
		});
	});

	it("should call 'call' targeting local broker", async () => {
		const command = `call "math.add" --$local --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json`;

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				$local: true,
				load: "my-params.json",
				stream: "my-picture.jpg",
				save: "my-response.json",
				loadFull: "params.json",
			},
			actionName: "math.add",
			nodeID: broker.nodeID,
			rawCommand:
				"call math.add --$local --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json",
		});
	});
});

describe("Test 'dcall' command", () => {
	let program;
	let broker;

	// Mock the handler
	const cmdHandler = jest.fn();

	beforeAll(() => {
		program = new commander.Command();
		program.exitOverride();
		program.allowUnknownOption(true);

		program.showHelpAfterError(true);
		program.showSuggestionAfterError(true);

		// Create broker
		broker = new ServiceBroker({
			nodeID: "repl-" + process.pid,
			logger: false,
		});

		// Register the command
		declaration(program, broker, cmdHandler);
	});

	afterEach(() => {
		cmdHandler.mockClear();
	});

	it("should call 'dcall' with simple and nested params", async () => {
		const command =
			"dcall node123 greeter.hello --a 5 --b Bob --c --no-d --e.f hello";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: 5,
				b: "Bob",
				c: true,
				d: false,
				e: { f: "hello" },
			},
			actionName: "greeter.hello",
			nodeID: "node123",
			rawCommand:
				"dcall node123 greeter.hello --a 5 --b Bob --c --no-d --e.f hello",
		});
	});

	it("should call 'dcall' with arrays", async () => {
		const command = "dcall node123 greeter.hello --a 5 --a 6 --b 8 --b 12";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: [5, 6],
				b: [8, 12],
			},
			nodeID: "node123",
			actionName: "greeter.hello",
			rawCommand: "dcall node123 greeter.hello --a 5 --a 6 --b 8 --b 12",
		});
	});

	it("should call 'dcall' and NOT parse the values", async () => {
		// example from: https://github.com/moleculerjs/moleculer-repl/issues/54

		const command =
			'dcall node123 user.create --phone "+1111111" --passcode "0033"';

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: { phone: "+1111111", passcode: "0033" },
			actionName: "user.create",
			nodeID: "node123",
			rawCommand:
				"dcall node123 user.create --phone +1111111 --passcode 0033",
		});
	});

	it("should call 'call' and keep hexadecimals as string", async () => {
		// example adapted from: https://github.com/moleculerjs/moleculer-repl/issues/47

		const command =
			"dcall node123 greeter.hello --a 5 --a 6 --hash 0x7597 --b 8 --b 12 --traceHash 0xab706 --c testString";

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				a: [5, 6],
				b: [8, 12],
				c: "testString",
				hash: "0x7597",
				traceHash: "0xab706",
			},
			actionName: "greeter.hello",
			nodeID: "node123",
			rawCommand:
				"dcall node123 greeter.hello --a 5 --a 6 --hash 0x7597 --b 8 --b 12 --traceHash 0xab706 --c testString",
		});
	});

	it("should call 'dcall' with JSON string parameter", async () => {
		const command = `dcall node123 "math.add" '{"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } }' '{"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }'`;

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {},
			actionName: "math.add",
			nodeID: "node123",
			jsonParams:
				'{"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } }',
			meta: '{"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }',
			rawCommand: `dcall node123 math.add {"a": 5, "b": "Bob", "c": true, "d": false, "e": { "f": "hello" } } {"meta_a": 5, "meta_b": "Bob", "meta_c": true, "meta_d": false, "meta_e": { "meta_f": "hello" } }`,
		});
	});

	it("should call 'dcall' flags", async () => {
		const command = `dcall node123 "math.add" --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json`;

		await program.parseAsync(
			parseArgsStringToArgv(command, "node", "REPL")
		);

		expect(cmdHandler).toHaveBeenCalledTimes(1);
		expect(cmdHandler).toHaveBeenCalledWith(expect.any(ServiceBroker), {
			options: {
				load: "my-params.json",
				stream: "my-picture.jpg",
				save: "my-response.json",
				loadFull: "params.json",
			},
			actionName: "math.add",
			nodeID: "node123",
			rawCommand:
				"dcall node123 math.add --load my-params.json --stream my-picture.jpg --save my-response.json --loadFull params.json",
		});
	});
});
