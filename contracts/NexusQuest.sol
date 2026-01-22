// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexusQuest is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;

    struct Hero {
        string name;
        uint256 xp;
        string story;
        string imageURI;
    }

    mapping(uint256 => Hero) public characters;

    event AdventureRequested(uint256 indexed tokenId, string action);
    event AdventureResolved(uint256 indexed tokenId, string outcome, uint256 xpGained, string newImageURI);
    event NewHeroRequested(uint256 tokenId, address owner); 

    constructor() ERC721("NexusHero", "HERO") Ownable() {}
    

    function createCharacter(string memory _name) public {
        _nextTokenId++;
        uint256 newItemId = _nextTokenId;

        _safeMint(msg.sender, newItemId);
        characters[newItemId] = Hero(_name, 0, "The journey begins...", "");
        emit NewHeroRequested(newItemId, msg.sender);
    }

    function getHeroes(address _owner) public view returns (uint256[] memory) {
        uint256 ownerBalance = balanceOf(_owner);
        uint256[] memory tokens = new uint256[](ownerBalance);
        for (uint256 i = 0; i < ownerBalance; i++) {
            tokens[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokens;
    }

    function requestAdventure(uint256 _tokenId, string memory _action) public {
        require(ownerOf(_tokenId) == msg.sender, "Not your hero");
        emit AdventureRequested(_tokenId, _action);
    }

 // Update signature to take int256 for xpChange
    function resolveAdventure(uint256 _tokenId, string memory _outcome, int256 _xpChange, string memory _imageURI) public onlyOwner {
    Hero storage hero = characters[_tokenId];
    hero.story = _outcome;
    hero.imageURI = _imageURI;

    // Logic to handle negative XP
    if (_xpChange < 0) {
        uint256 deduction = uint256(-_xpChange);
        if (hero.xp > deduction) {
            hero.xp -= deduction;
        } else {
            hero.xp = 0; // Cap at 0, don't go negative
        }
    } else {
        hero.xp += uint256(_xpChange);
    }

    // Emit event (Need to update Event definition too!)
    emit AdventureResolved(_tokenId, _outcome, hero.xp, _imageURI);
    }
}