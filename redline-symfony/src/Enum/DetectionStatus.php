<?php

namespace App\Enum;

/** État de vie d'une détection. */
enum DetectionStatus: string
{
    case ACTIVE = 'ACTIVE';
    case RESOLVED = 'RESOLVED';
}
