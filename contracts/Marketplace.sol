// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    IERC721 public gameContract;

    event ItemListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ItemSold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address _gameContractAddress) {
        gameContract = IERC721(_gameContractAddress);
    }

    function listHero(uint256 _tokenId, uint256 _price) external nonReentrant {
        require(_price > 0, "Price must be > 0");
        // User must approve contract first!
        gameContract.transferFrom(msg.sender, address(this), _tokenId);
        listings[_tokenId] = Listing(msg.sender, _price, true);
        emit ItemListed(_tokenId, msg.sender, _price);
    }

    function buyHero(uint256 _tokenId) external payable nonReentrant {
        Listing memory listing = listings[_tokenId];
        require(listing.active, "Not for sale");
        require(msg.value >= listing.price, "Not enough ETH");

        listings[_tokenId].active = false;
        payable(listing.seller).transfer(listing.price);
        gameContract.transferFrom(address(this), msg.sender, _tokenId);
        emit ItemSold(_tokenId, msg.sender, listing.price);
    }

    function cancelListing(uint256 _tokenId) external nonReentrant {
        Listing memory listing = listings[_tokenId];
        require(listing.seller == msg.sender, "Not your listing");
        require(listing.active, "Not active");

        listings[_tokenId].active = false;
        gameContract.transferFrom(address(this), msg.sender, _tokenId);
        emit ListingCancelled(_tokenId, msg.sender);
    }
}