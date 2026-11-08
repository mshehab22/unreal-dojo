#include "DojoS5WavePlan.h"

#include "Curves/CurveFloat.h"

int32 UDojoS5WavePlan::GetBeetleCount(int32 Wave) const
{
	if (Wave < 1)
	{
		return 0;
	}

	const float Scale = CountScale != nullptr ? CountScale->GetFloatValue(static_cast<float>(Wave)) : 1.f;

	return FMath::Max(1, FMath::RoundToInt(BaseCount * Scale));
}

bool UDojoS5WavePlan::IsFinalWave(int32 Wave) const
{
	return Wave >= FinalWave;
}
