import { ProfileRepository } from '@infrastructure/repository/profile.repository';
import { Profile } from '@domain/entities/Profile';
import { Role } from '@domain/entities/enums/role.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let mockTypeOrmRepository: any;

  beforeEach(async () => {
    mockTypeOrmRepository = {
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ ...data })),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      update: jest.fn(async () => ({ affected: 1 })),
      delete: jest.fn(async () => undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileRepository,
        {
          provide: getRepositoryToken(ProfileEntity),
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    repository = module.get<ProfileRepository>(ProfileRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new profile', async () => {
      const profileData: Partial<Profile> = {
        id: faker.string.uuid(),
        authId: faker.string.uuid(),
        name: faker.person.firstName(),
        lastname: faker.person.lastName(),
        age: faker.number.int({ min: 18, max: 80 }),
      };

      const result = await repository.create(profileData);

      expect(mockTypeOrmRepository.create).toHaveBeenCalledWith(profileData);
      expect(mockTypeOrmRepository.save).toHaveBeenCalled();
      expect(result).toEqual(profileData);
    });
  });

  describe('findAll', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [
        {
          toObject: jest.fn().mockReturnValue({
            id: faker.string.uuid(),
            authId: faker.string.uuid(),
            name: faker.person.firstName(),
            lastname: faker.person.lastName(),
            age: 25,
          }),
        },
        {
          toObject: jest.fn().mockReturnValue({
            id: faker.string.uuid(),
            authId: faker.string.uuid(),
            name: faker.person.firstName(),
            lastname: faker.person.lastName(),
            age: 30,
          }),
        },
      ];

      mockTypeOrmRepository.find.mockResolvedValue(mockProfiles as any);

      const result = await repository.findAll();

      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({ relations: ['auth'] });
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return profile when found', async () => {
      const profileId = faker.string.uuid();
      const mockProfile = {
        toObject: jest.fn().mockReturnValue({
          id: profileId,
          authId: faker.string.uuid(),
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        }),
      };

      mockTypeOrmRepository.findOne.mockResolvedValue(mockProfile as any);

      const result = await repository.findById(profileId);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: profileId }, relations: ['auth'] });
      expect(result).toBeDefined();
    });

    it('should return null when profile not found', async () => {
      const profileId = faker.string.uuid();

      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(profileId);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: profileId }, relations: ['auth'] });
      expect(result).toBeNull();
    });
  });

  describe('findByAuthId', () => {
    it('should return profile when found by authId', async () => {
      const authId = faker.string.uuid();
      const mockProfile = {
        toObject: jest.fn().mockReturnValue({
          id: faker.string.uuid(),
          authId: authId,
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        }),
      };

      mockTypeOrmRepository.findOne.mockResolvedValue(mockProfile as any);

      const result = await repository.findByAuthId(authId);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { authId }, relations: ['auth'] });
      expect(result).toBeDefined();
    });

    it('should return null when profile not found by authId', async () => {
      const authId = faker.string.uuid();

      mockTypeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByAuthId(authId);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { authId }, relations: ['auth'] });
      expect(result).toBeNull();
    });
  });

  describe('findByRole', () => {
    it('should return profiles with specific role', async () => {
      const mockProfiles = [
        {
          id: faker.string.uuid(),
          authId: faker.string.uuid(),
          name: faker.person.firstName(),
          lastname: faker.person.lastName(),
          age: 25,
        },
      ];

      mockTypeOrmRepository.find.mockResolvedValue(mockProfiles as any);

      const result = await repository.findByRole(Role.ADMIN);

      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        relations: ['auth'],
        where: { auth: { role: Role.ADMIN } },
      });
      expect(result).toEqual(mockProfiles);
    });
  });

  describe('update', () => {
    it('should update and return profile', async () => {
      const profileId = faker.string.uuid();
      const updateData = { name: 'Updated Name' };
      const updated = {
        id: profileId,
        authId: faker.string.uuid(),
        name: 'Updated Name',
        lastname: faker.person.lastName(),
        age: 25,
      };

      mockTypeOrmRepository.update.mockResolvedValue({ affected: 1 });
      mockTypeOrmRepository.findOne.mockResolvedValue(updated as any);

      const result = await repository.update(profileId, updateData);

      expect(mockTypeOrmRepository.update).toHaveBeenCalledWith(profileId, updateData);
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where: { id: profileId }, relations: ['auth'] });
      expect(result).toBeDefined();
    });

    it('should throw error when profile not found for update', async () => {
      const profileId = faker.string.uuid();
      const updateData = { name: 'Updated Name' };

      mockTypeOrmRepository.update.mockResolvedValue({ affected: 0 });

      await expect(repository.update(profileId, updateData)).rejects.toThrow('Profile not found');
    });
  });

  describe('delete', () => {
    it('should delete profile', async () => {
      const profileId = faker.string.uuid();

      await repository.delete(profileId);

      expect(mockTypeOrmRepository.delete).toHaveBeenCalledWith(profileId);
    });
  });
});