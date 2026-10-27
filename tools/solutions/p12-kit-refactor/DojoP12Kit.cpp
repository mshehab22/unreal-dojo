#include "DojoP12Kit.h"

UDojoP12Kit::UDojoP12Kit()
{
	Charm = CreateDefaultSubobject<UDojoP12Charm>(TEXT("Charm"));
}

UDojoP12Kit* UDojoP12Kit::Clone() const
{
	return DuplicateObject<UDojoP12Kit>(this, GetOuter());
}
