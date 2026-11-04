#include "DojoP21DudLauncher.h"

ADojoP21Bolt* ADojoP21DudLauncher::CreateBolt(const FTransform& Muzzle)
{
	return nullptr; // @explain: A creator is allowed to fail, and the answer is nullptr, so a caller such as Fire has to check for it before it touches the result.
}
