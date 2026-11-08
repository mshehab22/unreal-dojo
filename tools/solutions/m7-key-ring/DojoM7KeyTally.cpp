#include "DojoM7KeyTally.h"

#include "DojoM7KeyRing.h"

ADojoM7KeyTally::ADojoM7KeyTally()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM7KeyTally::Listen(UDojoM7KeyRing* Ring)
{
	if (!IsValid(Ring)) return;

	Ring->OnKeyAdded.AddUniqueDynamic(this, &ADojoM7KeyTally::HandleKeyAdded);
}

int32 ADojoM7KeyTally::GetHeard() const
{
	return Heard;
}

FName ADojoM7KeyTally::GetLastKey() const
{
	return LastKey;
}

void ADojoM7KeyTally::HandleKeyAdded(FName KeyId)
{
	Heard++;
	LastKey = KeyId;
}
