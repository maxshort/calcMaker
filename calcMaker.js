// "Phase 2" Ideas
//  - Generally format it much nicer...
//    - ON display -- could separate the formula stuff from the display?? Or make the text optionally show up?
//		- There's too much visual noise to read the formula...
//  	- Prob. need to draw this on paper.
//  - Put the new (operator,constant etc.) dialog in line with the formula
//  - Edit existing equation -- load it into the CalcMaker.html - 
//    - be able to delete elements of an equation / insert at arbitrary points -- the way it exists now, we'd have to
//      make them delete an operator and equation element at the same time.
//  - Explore outputting html code.
//  - Do an expalnation mode where it works stuff down one by one...

const OPERATOR = "operator";
const CONSTANT = "constant";
const USER_INPUT = "user_input";

//Set would probably be better?
const PHASE_1_OPERATORS = ["/", "*"];
const PHASE_2_OPERATORS = ["+", "-"];

// {type: "operator", value: "+"}
// {type: "constant", value: "4"}
// {type: "user_input", value: null, label: "Your input 1"}  // Can have a nullable value

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
function makeUserInput(inputPiece, withInput=false) {
	const rId = "rid" + Math.random().toString().substring(2);
	// + is the unary conversion operator
	inputPiece.valueResolver = () => +(document.getElementById(rId).value);
	return `<label for="${rId}">${inputPiece.label}</label>: ${makeAdjustableNumberInput(rId)}`
}

function updateBoxWidth(box) {
	numPx = 30 + 8 * box.value.length;
	box.style.width = numPx + "px";
}

function makeAdjustableNumberInput(id) {
	// there's prob. a cleaner way then looking up the id...
	return `<input id="${id}" type=number style="width: 30px" oninput="updateBoxWidth(document.getElementById('${id}'))">`;
}

// valueResolver added here too for consistency / ergonomics later.
function makeConstant(constantPiece) {
	constantPiece.valueResolver = () => +constantPiece.value;
	return `<b>${constantPiece.value}</b>`
}

// Answer templates are returned as is except %a is replaced with the answer
// There is no 
// A null answer template just returns the answer
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

function fromString(s) {
	// Go to first colon -- that's a label. + question mark for textbox are made together
	// operator
	// (repeat)
	
	formulaPieces = []
	while (s.trim().length > 0) {
		var constToAddPair = consumeConstant(s);
		if (constToAddPair != null) {
			[constToAdd, s] = constToAddPair;
			formulaPieces.push(constToAdd)
		} else {
			var labelToAddPair = consumeLabel(s);
			if (labelToAddPair != null ) {
				[labelToAdd, s] = labelToAddPair;
				formulaPieces.push(labelToAdd);
			} else { // If neither const or user input are present, formula is invalid from here on...
				break;
			}	
		}
		var opToAddPair = consumeOperator(s);
		console.log("OP TO ADD PAIR: ", opToAddPair);
		if (opToAddPair == null) {
			break;
		}
		[opToAdd, s] = opToAddPair;
		formulaPieces.push(opToAdd);
	}
	console.log("FORMULA PIECES", formulaPieces);
	return formulaPieces;
	//return makeCalc("no title", formulaPieces);
	
}

// In all of these, returned string may have leading whitespace...

// TODO: Would be nice to have some kind of error checking...

// It's a constant if it parses as a number (with only whitespace) before next constant or end of string.
// Could probably regex that.
function consumeConstant(s) {
	m = s.match(/^\s*(\d+)\s*/);
	if (!m) {
		return null;
	}
	number = +m[1]
	consumedLen = m[0].length;
	return [serializeConstant(number), s.slice(consumedLen)];
}

// Consumes all the way up to a colon:, then returns (parsed, remaining str).
function consumeLabel(s) {
	colonIdx = s.indexOf(":");
	if (colonIdx == -1) {
		return null;
	}
	// For now, next character must be a question mark...in the future it might be slick to type label without box, type ?, see box...
	// We'll consider it "not complete" if ? is not there...
	questionMarkIdx = s.indexOf("?", colonIdx)
	if (questionMarkIdx == -1) {
		return null;
	}
	label = s.slice(0, colonIdx);
	remaining = s.slice(questionMarkIdx + 1);
	return [serializeUserInput(label), remaining]
}

function consumeOperator(s) {
	// Funky b/c of escapes but just the 4 arithmetic operators surrounded by whitespace.
	m = s.match(/^\s*(\+|-|\*|\/)\s*/);
	if (m == null) {
		return null;
	}
	op = serializeOperator(m[1]);
	consumedLen = m[0].length;
	return [op, s.slice(consumedLen)];
}

// One problem if we have it simultaneously updating -- we couldn't preserve user whitespace...
function formulaToString(pieces) {
	return pieces.map(formulaPiece => {
		switch(formulaPiece.type) {
			case OPERATOR:
				return formulaPiece.value;
			case CONSTANT:
				return formulaPiece.value;
			case USER_INPUT:
				return (formulaPiece.label + ": ?");
			default: throw "Unrecognized formula piece: " + JSON.stringify(formulaPiece);
	}}).join(" ");
	
}
