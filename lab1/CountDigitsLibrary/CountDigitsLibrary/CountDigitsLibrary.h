#pragma once

#ifdef COUNTDIGITSLIBRARY_EXPORTS
#define COUNTDIGITSLIBRARY_API __declspec(dllexport)
#else
#define COUNTDIGITSLIBRARY_API __declspec(dllimport)
#endif

#include <string>


extern "C" COUNTDIGITSLIBRARY_API int CountDigits(std::string str);