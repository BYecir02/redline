<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Authentification : inscription, connexion (JWT) et utilisateur courant.
 * Contrat aligné sur le front : { token, user } en succès, { error } en échec.
 */
#[Route('/api/auth')]
class AuthController extends AbstractController
{
    #[Route('/signup', name: 'auth_signup', methods: ['POST'])]
    public function signup(
        Request $request,
        UserRepository $users,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
        JWTTokenManagerInterface $jwt,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            return $this->json(['error' => 'Email et mot de passe requis.'], 400);
        }
        if (mb_strlen($password) < 8) {
            return $this->json(['error' => 'Le mot de passe doit faire au moins 8 caractères.'], 400);
        }
        if ($users->findOneBy(['email' => $email]) !== null) {
            return $this->json(['error' => 'Un compte existe déjà avec cet email.'], 409);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setPasswordHash($hasher->hashPassword($user, $password));
        $em->persist($user);
        $em->flush();

        return $this->json([
            'token' => $jwt->create($user),
            'user' => $this->userView($user),
        ], 201);
    }

    #[Route('/login', name: 'auth_login', methods: ['POST'])]
    public function login(
        Request $request,
        UserRepository $users,
        UserPasswordHasherInterface $hasher,
        JWTTokenManagerInterface $jwt,
        RateLimiterFactory $loginLimiter,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim((string) ($data['email'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        // Anti-brute-force : seuls les ÉCHECS consomment un jeton. Une connexion
        // valide (crédentiels vérifiés avant) n'est jamais bloquée et remet le
        // compteur à zéro. Au-delà du quota d'échecs pour cette IP → 429.
        $limiter = $loginLimiter->create($request->getClientIp() ?? 'anon');

        $user = $email !== '' ? $users->findOneBy(['email' => $email]) : null;
        if ($user === null || !$hasher->isPasswordValid($user, $password)) {
            if (!$limiter->consume(1)->isAccepted()) {
                return $this->json(['error' => 'Trop de tentatives de connexion. Réessayez plus tard.'], 429);
            }

            return $this->json(['error' => 'Email ou mot de passe incorrect.'], 401);
        }

        $limiter->reset();

        return $this->json([
            'token' => $jwt->create($user),
            'user' => $this->userView($user),
        ]);
    }

    #[Route('/me', name: 'auth_me', methods: ['GET'])]
    public function me(#[CurrentUser] ?User $user): JsonResponse
    {
        if ($user === null) {
            return $this->json(['error' => 'Non authentifié.'], 401);
        }

        return $this->json(['user' => $this->userView($user)]);
    }

    /**
     * Vue publique d'un utilisateur (jamais le hash).
     *
     * @return array{id: string, email: string, createdAt: string}
     */
    private function userView(User $user): array
    {
        return [
            'id' => (string) $user->getId(),
            'email' => $user->getEmail(),
            'createdAt' => $user->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
