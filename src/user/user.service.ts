import { JwtPayload } from '@auth/types';
import { convertToSecondsUtil } from '@common/decorators/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { genSaltSync, hashSync } from 'bcrypt';
import { CacheManagerStore } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: CacheManagerStore,
    private readonly configService: ConfigService,
  ) {}

  create(user: Partial<User>) {
    const hashedPassword = this.hashPassword(user.password!);

    return this.prismaService.user.create({
      data: {
        email: user.email!,
        password: hashedPassword,
        roles: ['USER'],
      },
    });
  }

  async findOne(idOrEmail: string, isReset = false) {
    if (isReset) {
      await this.cacheManager.get(idOrEmail);
    }

    const user = await this.cacheManager.get(idOrEmail);

    if (!user) {
      const user = this.prismaService.user.findFirst({
        where: { OR: [{ id: idOrEmail }, { email: idOrEmail }] },
      });

      if (!user) {
        return null;
      }

      await this.cacheManager.set(
        idOrEmail,
        user,
        convertToSecondsUtil(this.configService.get('JWT_EXP')!),
      );

      return user;
    }

    return user;
  }

  async delete(id: string, user: JwtPayload) {
    if (user.id !== id && !user.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException();
    }

    await Promise.all([
      this.cacheManager.del(id),
      this.cacheManager.del(user.email),
    ]);

    return this.prismaService.user.delete({
      where: { id },
      select: { id: true },
    });
  }

  private hashPassword(password: string) {
    return hashSync(password, genSaltSync(10));
  }
}
