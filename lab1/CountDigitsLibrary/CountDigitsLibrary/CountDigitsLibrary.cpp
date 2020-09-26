#include "pch.h"
#include "CountDigitsLibrary.h"
#include <string>

COUNTDIGITSLIBRARY_API int CountDigits(std::string str) {
    int counter = 0;
    for (int i = 0; i < str.size(); ++i) {
        if (std::isdigit(str[i])) {
            ++counter;
        }
    }
    return counter;
}