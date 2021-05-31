pdfjsLib.GlobalWorkerOptions.workerSrc = "https://mozilla.github.io/pdf.js/build/pdf.worker.js";

// List of month to convert int to string
var months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// Convert input files into ArrayBuffer readable by pdfjsLib.getDocument
function read(callback, file) {
	var fileReader = new FileReader ();
	var eventReturn;
	// Called when the FileReader as done reading
	var p = new Promise((resolve, reject) => fileReader.onload = function () {
		eventReturn = callback(fileReader.result, file);
		resolve(eventReturn)
	});


	fileReader.readAsArrayBuffer(file)
	return p
}

// Read the text content of the first page of a pdf file
function readPdf(arrayBuffer) {
	return new Promise((resolve, reject) => 
		pdfjsLib.getDocument(arrayBuffer).promise.then(function (fullPdf) {
			fullPdf.getPage(1).then(function (pdfPage) { 
				pdfPage.getTextContent().then(function (textContent) {
					var textItems = textContent.items;
					var fullText = [];

					var n = textItems.length;

					for (var i = 0; i < n; i+=1) {
						fullText.push(textItems[i].str);
					};
					resolve (fullText);
				})
			})
		}))
}

function beautifulTitle (str) {
	var month = str.substring(0, 2);
	var year = str.substring(3, 7);
	var fullName = str.substring(7, str.length - 4);
	var n = fullName.length;
	var i;

	for (i=1; i < n; i += 1) {
		if (fullName[i] === fullName[i].toUpperCase()){
			break
		}
	}

	fullName = fullName.substring(0, i) + "&nbsp;" + fullName.substring(i);

	return (months[month-1] + " " + year + ", " + fullName);
}

function selectNthNonNull (list, index, n) {
	var i = n;
	var k = 1;
	while (i > 0) {
		if (list[index + k].replaceAll(" ", "") !== "") {
			i -= 1;
		} 
		k += 1;
	}
	return (list[index + k - 1])
}

function extractMeaningfulNumber (fullText, listOfName, file) {
	var title = file.name;
	var smic = listOfName[listOfName.length - 1].replace(',', '.');
	var numbers = []
	for (var i = 0; i < (listOfName.length - 1); i+=1) {
	    var index = fullText.findIndex(element => (element.replaceAll(" ", "") === listOfName[i].replaceAll(" ", "")));
	    if (i === 1) {
		numbers.push(selectNthNonNull(fullText, index, 3).replaceAll(',', '.'));
	    } else {
		numbers.push(selectNthNonNull(fullText, index, 1).replaceAll(',', '.'));
	    }
	}
	return [title, numbers, smic]
}

function exonerationCalculus (numbers, smic) {
	var a = numbers[0];
	var b = numbers[1];
	var c = 3 * numbers[2] * smic
	return [a, b, c]
}

function createOutputBox (title, content) {
	var output = document.createElement("div");
	var outputTitle = document.createElement("div");
	var outputLine = document.createElement("div");
	var outputContent = document.createElement("div");

	output.classList.add("output");
	outputTitle.classList.add("output-title");
	outputLine.classList.add("output-line");
	outputContent.classList.add("output-content");

	outputTitle.innerHTML = title;
	outputContent.innerHTML = content;

	output.appendChild(outputTitle);
	output.appendChild(outputLine);
	output.appendChild(outputContent);

	return output
	
}

function displayBoxes (listOfBoxes) {
	var n = listOfBoxes.length;
	var nbRow = Math.floor(n/3);
	var outputContainer = document.getElementById("result");

	for (var i = 0; i<nbRow; i+=1) {
		var outputDisp = document.createElement("div");
		outputDisp.classList.add("output-disp");
		for (var j = 0; j < 3; j +=1) {
			outputDisp.appendChild(listOfBoxes[3*i + j]);
		}
		outputContainer.appendChild(outputDisp);
	};
	var outputDisp = document.createElement("div");
	outputDisp.classList.add("output-disp");
	for (var i = 3*nbRow; i < n; i += 1) {
		outputDisp.appendChild(listOfBoxes[i]);
	};
	outputContainer.appendChild(outputDisp);
}

// Function called each time the value of input is refreshed
function onChange () {
	var outputContainer = document.getElementById("result");
	outputContainer.innerHTML = "";
	var popup = document.getElementById("form-container");
	popup.style.display = "flex";

	var sendButton = document.getElementById("sendButton");
	var p1 = new Promise ((resolve, reject) => {
		sendButton.onclick = function (event) {
			var popupInput = document.getElementsByClassName("inputValue");
			var listOfName = [];
			for (var i = 0; i<popupInput.length; i += 1) {
				listOfName.push(popupInput[i].value);
			}
			document.getElementById("form-container").style.display = "none";
			resolve(listOfName)
		}
	});
	var smicInput = document.getElementById("smicHoraire");
	smicInput.addEventListener('keyup', function(event) {
		if (event.keyCode === 13) {
			sendButton.click();
		};	
	});

	var input = document.getElementById ("pickfile");
	var PdfPromesses = [];
	for (var i = 0; i<input.files.length; i+=1) {
		PdfPromesses.push(read(readPdf, input.files[i]));
	}
	var resTextsPdf = Promise.all(PdfPromesses);

	var totalD = 0;
	var outputBoxList = [];
	p1.then(listOfName => {
		resTextsPdf.then(resTextsPdf => {
			for (var i = 0; i<resTextsPdf.length; i+=1) {
				var [title, numbers, smic] = extractMeaningfulNumber(resTextsPdf[i], listOfName, input.files[i]);
				var [a, b, c] = exonerationCalculus(numbers, smic);
				var d = (parseFloat(a)+parseFloat(b)) - c;
				totalD = Math.max(0, d) + totalD;
			    var content = "A = " +a+ "<br>B = " +b+ "<br>C = 3 x " +numbers[2]+ " x " +smic+ " = " +c.toFixed(2)+ "<br>D = " +a+ " + " +b+ " - " +c.toFixed(2)+ " = " +d.toFixed(2);
				outputBoxList.push(createOutputBox(beautifulTitle(title), content));
			}
			var totalBox = createOutputBox("Total à déclarer", totalD.toFixed(2) +"€");
			totalBox.classList.add("total");
			outputContainer.appendChild(totalBox);
			displayBoxes(outputBoxList);
		});
	});
}
