#include "DojoP11Crowd.h"

ADojoP11Crowd::ADojoP11Crowd()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoP11Crowd::BeginPlay()
{
	Super::BeginPlay();

	SeatFans();
}

void ADojoP11Crowd::SeatFans()
{
	Fans.Reset();

	const int32 StyleCount = FMath::Min(Styles.Num(), 255);
	if (StyleCount == 0) return;

	Fans.Reserve(FanCount);
	for (int32 Seat = 0; Seat < FanCount; Seat++)
	{
		FDojoP11Fan Fan;
		Fan.Seat = Seat;
		Fan.StyleIndex = static_cast<uint8>(Seat % StyleCount);
		Fans.Add(Fan);
	}
}

void ADojoP11Crowd::Excite(float Amount)
{
	for (FDojoP11Fan& Fan : Fans) Fan.Excitement = FMath::Clamp(Fan.Excitement + Amount, 0.f, 1.f);
}

float ADojoP11Crowd::GetLoudness() const
{
	float Loudness = 0.f;

	for (const FDojoP11Fan& Fan : Fans)
	{
		if (Styles.IsValidIndex(Fan.StyleIndex)) Loudness += Fan.Excitement * Styles[Fan.StyleIndex].CheerVolume;
	}

	return Loudness;
}

int32 ADojoP11Crowd::GetFanCount() const
{
	return Fans.Num();
}

const FDojoP11FanStyle* ADojoP11Crowd::GetStyleOf(int32 Index) const
{
	const FDojoP11Fan* Fan = GetFan(Index);
	return Fan && Styles.IsValidIndex(Fan->StyleIndex) ? &Styles[Fan->StyleIndex] : nullptr;
}

const FDojoP11Fan* ADojoP11Crowd::GetFan(int32 Index) const
{
	return Fans.IsValidIndex(Index) ? &Fans[Index] : nullptr;
}
