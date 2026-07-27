<?php

namespace App\Enum;

/** Nature d'un événement du journal de détections. */
enum EventType: string
{
    case APPEARED = 'APPEARED';
    case RESOLVED = 'RESOLVED';
    case REOPENED = 'REOPENED';
}
