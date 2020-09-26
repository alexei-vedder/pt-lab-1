#include <iostream>
#include <string>
#include "CountDigitsLibrary.h"

const char YES_CHAR = 'y';
const std::string ABOUT_MESSAGE = "Calculate the number of digits in your string";
const std::string CONTINUE_MESSAGE = "Continue? (y/n)>";
const std::string INPUT_MESSAGE = "Input a string>";
const std::string OUTPUT_MESSAGE = "Result: ";

std::string ReadString(std::istream& in) {
	std::cout << INPUT_MESSAGE;
	std::string answer;
	in >> answer;
	return answer;
}

bool NeedContinue(std::istream& in) {
	std::cout << CONTINUE_MESSAGE;
	char answer;
	in >> answer;
	return answer == YES_CHAR;
}

int main() {
	std::cout << ABOUT_MESSAGE << std::endl;
	bool doContinue = true;
	while (doContinue) {
		std::string str = ReadString(std::cin);
		std::cout << OUTPUT_MESSAGE << CountDigits(str) << std::endl;
		doContinue = NeedContinue(std::cin);
	}
	return 0;
}
