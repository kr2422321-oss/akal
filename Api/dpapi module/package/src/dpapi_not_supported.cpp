#include <napi.h>

void ProtectDataCommon(bool protect, const Napi::CallbackInfo& info)
{
	Napi::Env env = info.Env();

	throw Napi::Error::New(env, "Data protection API is not available on macOs or Linux");
}
