// "Phase 2" Ideas
//  - Do an expalnation mode where it works stuff down one by one...
//  - Put the new (operator,constant etc.) dialog in line with the formula
//  - Generally format it much nicer...

const OPERATOR = "operator";
const CONSTANT = "constant";
const USER_INPUT = "user_input";

//Set would probably be better?
const PHASE_1_OPERATORS = ["/", "*"];
const PHASE_2_OPERATORS = ["+", "-"];

// {type: "operator", value: "+"}
// {type: "constant", value: "4"}
// {type: "user_input", value: null, label: "Your input 1"}  // Can have a nullable value


//TODO: A quick templating langauge for "Advanced users" that's automatically updated at the bottom of the screen could be cool.

function makeOperator(operatorPiece) {
	return operatorPiece.value;
}

function serializeUserInput(label) {
	return {"type": USER_INPUT, "label": label};
}

function serializeConstant(value) {
	return {"type": CONSTANT, "value": 	+value};
}

function serializeOperator(operatorValue) {
	return {"type": OPERATOR, "value": operatorValue};
}

// Not idempotent, tacks on a valueResolver...
function makeUserInput(inputPiece) {
	const rId = "rid" + Math.random().toString().substring(2);
	// + is the unary conversion operator
	inputPiece.valueResolver = () => +(document.getElementById(rId).value);
	return `<label for="${rId}">${inputPiece.label}</label><input id="${rId}" type=number />`
}

// valueResolver added here too for consistency / ergonomics later.
function makeConstant(constantPiece) {
	constantPiece.valueResolver = () => +constantPiece.value;
	return `<b>${constantPiece.value}</b>`
}

// Answer templates are returned as is except %a is replaced with the answer
// There is no 
// A null answer template just returns the answer TODO: Doesn't JS have default args?
function makeFormattedAnswer(template, answer) {
	if(!template) {
		template = "%a";
	}
	return template.replaceAll("%a", answer);
}

function makeCalc(title, formulaPieces) {
	ret = ""
	if (title) {
		ret = `<h3>${title}</h3>`
	}
	ret+= formulaPieces.map(formulaPiece => {
		switch(formulaPiece.type) {
			case OPERATOR:
				return makeOperator(formulaPiece);
				break;
			case CONSTANT:
				return makeConstant(formulaPiece);
				break;
			case USER_INPUT:
				return makeUserInput(formulaPiece);
				break;
			default: throw "Unrecognized formula piece: " + JSON.stringify(formulaPiece);
		}
	}).join(' ');
	return ret;
}

function getFormattedAnswer(formulaPieces, answerTemplate) {
	return makeFormattedAnswer(answerTemplate, getAnswer(formulaPieces));
}

function getAnswer(formulaPieces) {
	console.log("FORMP", formulaPieces);

	// Should always have either an answer or number, op, number (with op, number after)
	if (formulaPieces.length %2 == 0) {
		throw "Formula pieces was even" + JSON.stringify(formulaPieces);
	}
	
	// Going to go recursively for now...
	if (formulaPieces.length == 1) {
		return formulaPieces[0].valueResolver();
	}
	//Search for the first mult + division opertoar / splice on both sides there, continue recursively. 
	// Operators are always on odd numbered indices.
	for (let i = 1; i < formulaPieces.length; i++) {
		if (PHASE_1_OPERATORS.includes(formulaPieces[i].value)) {
			const subAnswer = performOperation(formulaPieces[i - 1].valueResolver(), formulaPieces[i].value, formulaPieces[i + 1].valueResolver());
			return getAnswer(
				formulaPieces.slice(0, i - 1)
				.concat({"type": CONSTANT, "value": subAnswer, "valueResolver": () => subAnswer})
				.concat(formulaPieces.slice(i+2)))
			//TODO: figure out where to return from ... here, right?
		}
	}
	// At  this point, no mult or division...
	const subAnswer = performOperation(formulaPieces[0].valueResolver(), formulaPieces[1].value, formulaPieces[2].valueResolver());
	return getAnswer([{"type": CONSTANT, "value": subAnswer, "valueResolver": () => subAnswer}].concat(formulaPieces.slice(3)));
}

function performOperation(value1, operator, value2) {
	console.log("OPERATION", value1, value2);
	switch(operator) {
		case '+':
			return value1 + value2;
			break;
		case '-':
			return value1 - value2;
			break;
		case '*':
			return value1 * value2;
			break;
		case '/':
			return value1 / value2;
			break;
		default:
			throw "Unrecognized operator: " + operator
	}
}